import { Component, inject, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import SharedModule from 'app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ICustomerDetails } from 'app/entities/customer-details/customer-details.model';
import { CustomerDetailsService } from 'app/entities/customer-details/service/customer-details.service';
import { OrderStatus } from 'app/entities/enumerations/order-status.model';
import { PaymentMethod } from 'app/entities/enumerations/payment-method.model';
import { ShoppingCartService } from '../service/shopping-cart.service';
import { IShoppingCart } from '../shopping-cart.model';
import { ShoppingCartFormService, ShoppingCartFormGroup } from './shopping-cart-form.service';

@Component({
  standalone: true,
  selector: 'jhi-shopping-cart-update',
  templateUrl: './shopping-cart-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class ShoppingCartUpdateComponent implements OnInit {
  isSaving = false;
  shoppingCart: IShoppingCart | null = null;
  orderStatusValues = Object.keys(OrderStatus);
  paymentMethodValues = Object.keys(PaymentMethod);

  customerDetailsSharedCollection: ICustomerDetails[] = [];

  protected shoppingCartService = inject(ShoppingCartService);
  protected shoppingCartFormService = inject(ShoppingCartFormService);
  protected customerDetailsService = inject(CustomerDetailsService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ShoppingCartFormGroup = this.shoppingCartFormService.createShoppingCartFormGroup();

  compareCustomerDetails = (o1: ICustomerDetails | null, o2: ICustomerDetails | null): boolean =>
    this.customerDetailsService.compareCustomerDetails(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ shoppingCart }) => {
      this.shoppingCart = shoppingCart;
      if (shoppingCart) {
        this.updateForm(shoppingCart);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const shoppingCart = this.shoppingCartFormService.getShoppingCart(this.editForm);
    if (shoppingCart.id !== null) {
      this.subscribeToSaveResponse(this.shoppingCartService.update(shoppingCart));
    } else {
      this.subscribeToSaveResponse(this.shoppingCartService.create(shoppingCart));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IShoppingCart>>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving = false;
  }

  protected updateForm(shoppingCart: IShoppingCart): void {
    this.shoppingCart = shoppingCart;
    this.shoppingCartFormService.resetForm(this.editForm, shoppingCart);

    this.customerDetailsSharedCollection = this.customerDetailsService.addCustomerDetailsToCollectionIfMissing<ICustomerDetails>(
      this.customerDetailsSharedCollection,
      shoppingCart.customerDetails,
    );
  }

  protected loadRelationshipsOptions(): void {
    this.customerDetailsService
      .query()
      .pipe(map((res: HttpResponse<ICustomerDetails[]>) => res.body ?? []))
      .pipe(
        map((customerDetails: ICustomerDetails[]) =>
          this.customerDetailsService.addCustomerDetailsToCollectionIfMissing<ICustomerDetails>(
            customerDetails,
            this.shoppingCart?.customerDetails,
          ),
        ),
      )
      .subscribe((customerDetails: ICustomerDetails[]) => (this.customerDetailsSharedCollection = customerDetails));
  }
}
